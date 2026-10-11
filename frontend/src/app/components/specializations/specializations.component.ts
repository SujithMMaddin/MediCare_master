import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Specialization } from '../../core/models/specialization.model';
import { SpecializationService } from '../../core/services/specialization.service';
import { AuthService } from '../../core/services/auth.service';

@Component({selector:'app-specializations',standalone:true,imports:[RouterLink,MatCardModule,MatButtonModule,MatIconModule,MatProgressSpinnerModule],template:`
  <div class="page"><div class="page-title"><div><h1>Specialties</h1><p>Explore the specialties listed with MediCare.</p></div></div>
    @if(loading()){<div class="empty-state"><mat-spinner diameter="36"/></div>}
    @else if(error()){<div class="error-banner">{{error()}}</div>}
    @else if(!items().length){<div class="empty-state">No specialties are currently listed.</div>}
    @else{<div class="card-grid">@for(item of items();track item.id){<mat-card><mat-card-content><mat-icon>medical_services</mat-icon><h2>{{item.name}}</h2><p>Browse doctors and available appointment times.</p>@if(auth.isPatient()){<a mat-flat-button color="primary" [routerLink]="['/book']" [queryParams]="{specializationId:item.id}">Find a doctor</a>}</mat-card-content></mat-card>}</div>}
  </div>`,styles:[`.page-title p{color:var(--mc-muted)}mat-card mat-card-content{padding:22px}mat-card mat-icon{color:var(--mc-primary);font-size:32px;width:32px;height:32px}h2{color:#183e4b}`]})
export class SpecializationsComponent implements OnInit {
  private readonly service=inject(SpecializationService); readonly auth=inject(AuthService); readonly items=signal<Specialization[]>([]); readonly loading=signal(true); readonly error=signal(false);
  ngOnInit():void{this.service.getAll().subscribe({next:items=>{this.items.set(items);this.loading.set(false)},error:()=>{this.error.set(true);this.loading.set(false)}})}
}
