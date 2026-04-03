import { Component, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-statistics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './statistics.html',
  styleUrl: './statistics.css'
})
export class Statistics implements AfterViewInit {

  @ViewChild('barCanvas') barCanvas!: ElementRef;

  stats = [
    { label: 'Horas Totales', value: '124.5', sub: '+8.2 esta semana',  icon: 'clock'   },
    { label: 'Racha Actual',  value: '14',    sub: 'dias consecutivos', icon: 'fire'    },
    { label: 'Documentos',    value: '67',    sub: '12 creados este mes',icon: 'doc'     },
    { label: 'Objetivos',     value: '85%',   sub: 'completados este mes',icon: 'target' },
  ];

  weekly = [
    { label: 'Lectura',   percent: 72 },
    { label: 'Practica',  percent: 58 },
    { label: 'Revision',  percent: 90 },
    { label: 'Proyectos', percent: 45 },
  ];

  ngAfterViewInit() {
    new Chart(this.barCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'],
        datasets: [{
          data: [3, 5, 8, 6, 4, 2, 1],
          backgroundColor: '#3b82f6',
          borderRadius: 4,
          borderSkipped: false,
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#666', font: { size: 11 } },
            border: { display: false }
          },
          y: {
            display: false,
            grid: { display: false }
          }
        }
      }
    });
  }
}