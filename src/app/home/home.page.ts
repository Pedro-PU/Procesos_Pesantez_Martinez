import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { SchedulerService, Process, SchedulerResult } from '../services/scheduler';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule]
})
export class HomePage {
  // form model
  newName = '';
  newBurst: number | null = null;
  newPriority: number | null = null;

  // processes list
  processes: Process[] = [];

  // algorithm controls
  selectedAlgo: 'rr' | 'fcfs' = 'rr';
  quantum = 2;

  // result
  result?: SchedulerResult;

  // gantt scale px per time unit
  scale = 30;

  // edit state
  editingIndex: number | null = null;

  constructor(private scheduler: SchedulerService) {}

  // add or save process
  addOrSave() {
    const name = (this.newName || `P${this.processes.length + 1}`).toString();
    const burst = Number(this.newBurst ?? 0);
    if (!burst || burst <= 0) {
      alert('Ingresa un tiempo de ejecución válido (> 0).');
      return;
    }

    if (this.editingIndex === null) {
      const id = `P${this.processes.length + 1}`;
      this.processes.push({ id, name, burst: Math.round(burst), priority: this.newPriority ?? null });
    } else {
      const p = this.processes[this.editingIndex];
      p.name = name;
      p.burst = Math.round(burst);
      p.priority = this.newPriority ?? null;
      this.editingIndex = null;
    }

    this.newName = '';
    this.newBurst = null;
    this.newPriority = null;
    this.result = undefined;
  }

  editProcess(i: number) {
    const p = this.processes[i];
    this.editingIndex = i;
    this.newName = p.name;
    this.newBurst = p.burst;
    this.newPriority = p.priority ?? null;
  }

  removeProcess(i: number) {
    if (!confirm('Eliminar proceso?')) return;
    this.processes.splice(i, 1);
    this.processes = this.processes.map((p, idx) => ({ ...p, id: `P${idx + 1}` }));
    this.result = undefined;
  }

  clearAll() {
    if (!confirm('Limpiar todos los procesos?')) return;
    this.processes = [];
    this.result = undefined;
  }

  run() {
    if (!this.processes.length) {
      alert('Agrega al menos un proceso.');
      return;
    }

    const cloned = this.processes.map(p => ({ ...p }));

    if (this.selectedAlgo === 'rr') {
      this.result = this.scheduler.roundRobin(cloned, Math.max(1, Math.round(this.quantum)));
    } else {
      this.result = this.scheduler.fcfs(cloned);
    }

    // ===== ASIGNACIÓN DE COLORES POR PROCESO =====
    const colorMap: any = {};
    let colorCounter = 0;

    this.result.gantt = this.result.gantt.map(seg => {
      if (!colorMap[seg.name]) {
        colorMap[seg.name] = colorCounter++;
      }
      return { ...seg, colorIndex: colorMap[seg.name] };
    });
  }

  totalTime() {
    if (!this.result || !this.result.gantt.length) return 0;
    return this.result.gantt[this.result.gantt.length - 1].end;
  }

  get waitingIds() {
    return this.result ? Object.keys(this.result.waitingTimes) : [];
  }
}
