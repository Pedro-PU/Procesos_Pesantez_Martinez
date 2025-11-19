import { Injectable } from '@angular/core';

export interface Process {
  id: string;          // P1, P2...
  name: string;        // Nombre del proceso
  burst: number;       // Tiempo de ejecución
  arrival?: number;    // Nuevo: instante de llegada
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
  // --------------------------------------------
// ROUND ROBIN con llegada
// --------------------------------------------
roundRobin(processes: Process[], quantum: number): SchedulerResult {
    // Clonamos los procesos y agregamos remaining
    const pending = processes.map(p => ({ ...p, remaining: p.burst }));
    const queue: typeof pending = []; // cola de ejecución
    const gantt: GanttItem[] = [];
    const waiting: { [id: string]: number } = {};
    const turnaround: { [id: string]: number } = {};

    // Inicializar tiempos de espera en 0
    for (const p of pending) waiting[p.id] = 0;

    let time = 0;

    // Mientras haya procesos pendientes
    while (pending.some(p => p.remaining > 0) || queue.length > 0) {
      // Agregar a la cola todos los procesos que ya llegaron y no están en la cola
      for (let i = 0; i < pending.length; i++) {
        const p = pending[i];
        if (p.remaining > 0 && p.arrival! <= time && !queue.includes(p)) {
          queue.push(p);
        }
      }

      if (queue.length === 0) {
        // No hay procesos listos, avanzar tiempo al siguiente proceso que llegue
        const nextArrival = Math.min(...pending.filter(p => p.remaining > 0).map(p => p.arrival!));
        time = nextArrival;
        continue;
      }

      const p = queue.shift()!;
      const exec = Math.min(quantum, p.remaining);
      const start = time;
      time += exec;
      p.remaining -= exec;
      const end = time;

      // Registrar en Gantt
      gantt.push({
        id: p.id,
        name: p.name,
        start,
        end,
        colorIndex: this.hashColor(p.id)
      });

      // Si aún queda tiempo, volver a ponerlo en la cola
      if (p.remaining > 0) {
        queue.push(p);
      } else {
        turnaround[p.id] = end;
        waiting[p.id] = turnaround[p.id] - p.burst;
      }

      // Sumar tiempo de espera a los demás que ya están en cola
      for (const other of queue) {
        if (other.remaining > 0) {
          waiting[other.id] += exec;
        }
      }
    }

    const avg = Object.values(waiting).reduce((a, b) => a + b, 0) / processes.length;

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
