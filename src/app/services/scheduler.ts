import { Injectable } from '@angular/core';

export interface Process {
  id: string;          // P1, P2...
  name: string;        // Nombre del proceso
  burst: number;       // Tiempo de ejecución
  priority?: number | null;
}

export interface GanttItem {
  id: string;
  name: string;
  start: number;
  end: number;
  colorIndex: number;
}

export interface SchedulerResult {
  gantt: GanttItem[];
  waitingTimes: { [id: string]: number };
  turnaroundTimes: { [id: string]: number };
  averageWaitingTime: number;
}

@Injectable({
  providedIn: 'root'
})
export class SchedulerService {

  // --------------------------------------------
  // Color generado según el ID del proceso
  // --------------------------------------------
  private hashColor(id: string): number {
    let sum = 0;
    for (let i = 0; i < id.length; i++) {
      sum += id.charCodeAt(i);
    }
    return (sum % 6) + 1; // Colores entre 1 y 6
  }

  // --------------------------------------------
  // ROUND ROBIN
  // --------------------------------------------
  roundRobin(processes: Process[], quantum: number): SchedulerResult {

    const queue = processes.map(p => ({ ...p, remaining: p.burst }));
    const gantt: GanttItem[] = [];
    const waiting: { [id: string]: number } = {};
    const turnaround: { [id: string]: number } = {};

    for (const p of queue) waiting[p.id] = 0;

    let time = 0;

    while (queue.some(p => p.remaining > 0)) {

      const p = queue.shift()!;
      if (p.remaining <= 0) continue;

      const exec = Math.min(quantum, p.remaining);
      const start = time;
      time += exec;
      p.remaining -= exec;
      const end = time;

      gantt.push({
        id: p.id,
        name: p.name,
        start,
        end,
        colorIndex: this.hashColor(p.id)
      });

      if (p.remaining > 0) {
        queue.push(p);
      } else {
        turnaround[p.id] = end;
        waiting[p.id] = turnaround[p.id] - p.burst;
      }

      // Sumar tiempo de espera a los demás
      for (const other of queue) {
        if (other.remaining > 0) {
          waiting[other.id] += exec;
        }
      }
    }

    const avg =
      Object.values(waiting).reduce((a, b) => a + b, 0) / processes.length;

    return {
      gantt,
      waitingTimes: waiting,
      turnaroundTimes: turnaround,
      averageWaitingTime: avg
    };
  }

  // --------------------------------------------
  // FCFS
  // --------------------------------------------
  fcfs(processes: Process[]): SchedulerResult {

    const gantt: GanttItem[] = [];
    const waiting: { [id: string]: number } = {};
    const turnaround: { [id: string]: number } = {};

    let time = 0;

    for (const p of processes) {

      const start = time;
      const end = start + p.burst;

      gantt.push({
        id: p.id,
        name: p.name,
        start,
        end,
        colorIndex: this.hashColor(p.id)
      });

      waiting[p.id] = start;
      turnaround[p.id] = end;

      time = end;
    }

    const avg =
      Object.values(waiting).reduce((a, b) => a + b, 0) / processes.length;

    return {
      gantt,
      waitingTimes: waiting,
      turnaroundTimes: turnaround,
      averageWaitingTime: avg
    };
  }

  // --------------------------------------------
  // Parser de filas (input manual, CSV o Excel)
  // --------------------------------------------
  parseRows(rows: any[]): Process[] {
    return rows.map((r: any, i: number) => {

      const name =
        r.name ??
        r.Nombre ??
        r.Proceso ??
        r.proceso ??
        `P${i + 1}`;

      const burst =
        Number(
          r.burst ??
          r.Burst ??
          r['Tiempo'] ??
          r['Tiempo de ejecución'] ??
          r['Tiempo de ejecucion']
        ) || 0;

      const priority =
        r.priority ??
        r.prioridad ??
        r.Prioridad ??
        null;

      return {
        id: `P${i + 1}`,
        name: String(name),
        burst: burst,
        priority: priority === null ? null : Number(priority)
      };
    });
  }
}
