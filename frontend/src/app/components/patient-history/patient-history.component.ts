import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppointmentService, PatientHistoryRow } from '../../core/services/appointment.service';
import { extractErrorMessage } from '../../core/services/error-message';

@Component({selector:'app-patient-history',standalone:true,imports:[DatePipe,FormsModule],template:`
<div class="page"><div class="page-title"><div><h1>Patient History</h1><p>Appointment history is available. Clinical records are unavailable until consultations are recorded.</p></div></div>
<div class="filters"><input placeholder="Patient name" [(ngModel)]="name"><input placeholder="Doctor ID" type="number" [(ngModel)]="doctorId"><select [(ngModel)]="status"><option value="">All statuses</option>@for(s of statuses;track s){<option [value]="s">{{s}}</option>}</select><input type="date" [(ngModel)]="from"><input type="date" [(ngModel)]="to"><button (click)="load(0)">Search</button></div>
@if(error()){<div class="error-banner">{{error()}}</div>}
@if(rows().length){<div class="history">@for(row of rows();track $index){<article><h2>{{row.patientName}}</h2><p>{{row.relationship}}@if(row.dateOfBirth){ · Born {{row.dateOfBirth|date:'mediumDate'}}}</p>@if(row.appointmentDate){<p>{{row.appointmentDate|date:'medium'}} · {{row.appointmentStatus}} · Dr. {{row.doctorName}} ({{row.specialization}})</p>}@else{<p>No appointments recorded.</p>}<p>Clinical information: {{row.clinicalInformation||'Not recorded'}}</p></article>}</div>}
@if(!rows().length&&!error()){<p>No matching patient history found.</p>}<div class="pager"><button [disabled]="page()===0" (click)="load(page()-1)">Previous</button><span>Page {{page()+1}} of {{totalPages()||1}} · {{total()}} records</span><button [disabled]="page()+1>=totalPages()" (click)="load(page()+1)">Next</button></div></div>`,styles:[`.filters{display:flex;flex-wrap:wrap;gap:10px;margin:18px 0}.filters input,.filters select{padding:10px;border:1px solid #ccd8da;border-radius:6px}.history{display:grid;gap:12px}.history article{padding:16px;border:1px solid #e1e9ea;border-radius:10px}.history h2{font-size:18px;margin:0}.history p{margin:8px 0;color:#52666c}.pager{display:flex;justify-content:center;align-items:center;gap:16px;margin:18px}`]})
export class PatientHistoryComponent implements OnInit {
 private readonly api=inject(AppointmentService); readonly rows=signal<PatientHistoryRow[]>([]); readonly error=signal<string|null>(null); readonly page=signal(0); readonly totalPages=signal(0); readonly total=signal(0); readonly statuses=['PENDING','CONFIRMED','COMPLETED','CANCELLED','REJECTED','NO_SHOW']; name='';doctorId='';status='';from='';to='';
 ngOnInit(){this.load(0)}
 load(index:number){const params:any={page:index,size:20};if(this.name.trim())params.name=this.name.trim();if(this.doctorId)params.doctorId=Number(this.doctorId);if(this.status)params.status=this.status;if(this.from)params.from=this.from;if(this.to)params.to=this.to;this.error.set(null);this.api.patientHistory(params).subscribe({next:r=>{this.rows.set(r.content);this.page.set(r.number);this.totalPages.set(r.totalPages);this.total.set(r.totalElements)},error:e=>this.error.set(extractErrorMessage(e))})}
}
