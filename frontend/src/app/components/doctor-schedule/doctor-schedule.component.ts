import {Component,OnInit,inject,signal} from '@angular/core';
import {ActivatedRoute,RouterLink} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {DoctorService,AvailabilityRow} from '../../core/services/doctor.service';
import {extractErrorMessage} from '../../core/services/error-message';
@Component({selector:'app-doctor-schedule',standalone:true,imports:[FormsModule,RouterLink],template:`
<div class="page"><a routerLink="/admin/doctors">← Manage doctors</a><h1>Weekly availability</h1><p>Configure the recurring appointment schedule for this doctor. Approved leave dates are excluded separately.</p>
@if(error()){<div class="error-banner">{{error()}}</div>}<form (ngSubmit)="add()"><select [(ngModel)]="day" name="day">@for(d of days;track d){<option [value]="d">{{d}}</option>}</select><input type="time" [(ngModel)]="start" name="start"><input type="time" [(ngModel)]="end" name="end"><select [(ngModel)]="duration" name="duration"><option [ngValue]="15">15 min</option><option [ngValue]="30">30 min</option><option [ngValue]="45">45 min</option><option [ngValue]="60">60 min</option></select><button [disabled]="saving()">Add schedule</button></form>
<div class="list">@for(row of rows();track row.id){<article><strong>{{row.dayOfWeek}}</strong><span>{{row.startTime}}–{{row.endTime}} · {{row.slotDurationMinutes}} minute slots</span><button type="button" (click)="remove(row)">Remove</button></article>}@empty{<p>No weekly schedule configured. Add at least one working day to make future dates bookable.</p>}</div></div>`,styles:[`.page{max-width:900px}form,.list article{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:16px 0}input,select{padding:10px;border:1px solid #ccd8da;border-radius:6px}.list article{justify-content:space-between;padding:14px;border:1px solid #e2e9ea;border-radius:8px}`]})
export class DoctorScheduleComponent implements OnInit {
 private readonly route=inject(ActivatedRoute);private readonly api=inject(DoctorService);readonly rows=signal<AvailabilityRow[]>([]);readonly error=signal<string|null>(null);readonly saving=signal(false);readonly days=['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'];readonly doctorId=Number(this.route.snapshot.paramMap.get('id'));day='MONDAY';start='09:00';end='17:00';duration=30;
 ngOnInit(){this.load()}
 add(){this.saving.set(true);this.api.addAvailability(this.doctorId,{dayOfWeek:this.day,startTime:this.start,endTime:this.end,slotDurationMinutes:this.duration}).subscribe({next:r=>{this.rows.update(rows=>[...rows,r]);this.error.set(null);this.saving.set(false)},error:e=>{this.error.set(extractErrorMessage(e));this.saving.set(false)}})}
 remove(row:AvailabilityRow){this.api.deleteAvailability(this.doctorId,row.id).subscribe({next:()=>this.rows.update(rows=>rows.filter(r=>r.id!==row.id)),error:e=>this.error.set(extractErrorMessage(e))})}
 private load(){this.api.getAvailability(this.doctorId).subscribe({next:r=>this.rows.set(r),error:e=>this.error.set(extractErrorMessage(e))})}
}
