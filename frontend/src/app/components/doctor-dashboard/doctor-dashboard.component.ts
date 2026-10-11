import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AppointmentResponse } from '../../core/models/appointment.model';
import { AppointmentService } from '../../core/services/appointment.service';
import { extractErrorMessage } from '../../core/services/error-message';

@Component({selector:'app-doctor-dashboard',standalone:true,imports:[DatePipe,MatCardModule,MatButtonModule,MatIconModule,MatTableModule,MatProgressSpinnerModule,MatSnackBarModule],template:`
  <div class="page"><div class="page-title"><div><h1>Doctor appointments</h1><p>Review and update appointments assigned to you.</p></div></div>
    @if(targetNotice()){<div class="error-banner" role="status">{{targetNotice()}}</div>}
    @if(loading()){<div class="empty-state"><mat-spinner diameter="38"/></div>}
    @else if(error()){<div class="error-banner">{{error()}}</div>}
    @else if(!appointments().length){<mat-card><mat-card-content class="empty-state">You have no appointments yet.</mat-card-content></mat-card>}
    @else{<mat-card class="table-card"><table mat-table [dataSource]="appointments()">
      <ng-container matColumnDef="patient"><th mat-header-cell *matHeaderCellDef>Patient</th><td mat-cell *matCellDef="let a"><strong>{{a.patientName}}</strong><br><small>{{a.patientRelationship}} · booked by {{a.bookingAccountName}}</small></td></ng-container>
      <ng-container matColumnDef="time"><th mat-header-cell *matHeaderCellDef>Date &amp; time</th><td mat-cell *matCellDef="let a">{{a.appointmentDate|date:'EEE, d MMM y, h:mm a'}}</td></ng-container>
      <ng-container matColumnDef="reason"><th mat-header-cell *matHeaderCellDef>Reason</th><td mat-cell *matCellDef="let a">{{a.reason||'—'}}</td></ng-container>
      <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Status</th><td mat-cell *matCellDef="let a"><span class="status-chip" [class]="a.status">{{a.status}}</span></td></ng-container>
      <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef>Actions</th><td mat-cell *matCellDef="let a">
        @if(a.status==='PENDING'){<button mat-button color="primary" (click)="change(a,'confirm')">Confirm</button><button mat-button color="warn" (click)="change(a,'reject')">Reject</button>}
        @if(a.status==='CONFIRMED'){<button mat-button color="primary" (click)="change(a,'complete')">Complete</button>@if(isNoShowEligible(a)){<button mat-button color="warn" (click)="change(a,'no-show')">No-show</button>}}
      </td></ng-container>
      <tr mat-header-row *matHeaderRowDef="columns"></tr><tr mat-row *matRowDef="let row;columns:columns" [class.target-appointment]="row.id===selectedAppointmentId()" [attr.id]="'appointment-'+row.id"></tr>
    </table></mat-card>}
  </div>`,styles:[`.page-title p{color:var(--mc-muted)}small{color:var(--mc-muted)}.target-appointment{outline:3px solid var(--mc-primary);outline-offset:-3px;background:#e8f5f2}`]})
export class DoctorDashboardComponent implements OnInit {
  private readonly api=inject(AppointmentService); private readonly snack=inject(MatSnackBar); private readonly route=inject(ActivatedRoute);
  readonly targetNotice=signal<string|null>(null);readonly selectedAppointmentId=signal<number|null>(null);
  readonly appointments=signal<AppointmentResponse[]>([]); readonly loading=signal(true); readonly error=signal<string|null>(null); readonly columns=['patient','time','reason','status','actions'];
  ngOnInit():void{this.load()}
  isNoShowEligible(a:AppointmentResponse):boolean{return !!a.noShowEligibleAt&&new Date(a.noShowEligibleAt)<=new Date()}
  change(a:AppointmentResponse,action:'confirm'|'reject'|'complete'|'no-show'):void{
    const request=action==='confirm'?this.api.confirm(a.id):action==='reject'?this.api.reject(a.id):action==='complete'?this.api.complete(a.id):this.api.markNoShow(a.id);
    request.subscribe({next:updated=>{this.appointments.update(rows=>rows.map(row=>row.id===updated.id?updated:row));this.snack.open(`Appointment ${action==='no-show'?'marked no-show':action+'ed'}`,'OK',{duration:2500})},error:err=>this.snack.open(extractErrorMessage(err),'Close',{duration:4000})});
  }
  private load():void{this.api.getDoctorAppointments().subscribe({next:rows=>{this.appointments.set(rows);const id=Number(this.route.snapshot.queryParamMap.get('appointmentId'));if(id){if(rows.some(a=>a.id===id))this.selectedAppointmentId.set(id);else this.targetNotice.set(`Appointment ${id} is no longer assigned to your account. Your appointments are still shown below.`)}this.loading.set(false)},error:err=>{this.error.set(extractErrorMessage(err));this.loading.set(false)}})}
}
