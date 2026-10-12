"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, Printer, X } from "lucide-react";

type Job = { id: number; url: string; title: string; status: "printing" | "done" };

const EVENT = "kargia:print-label";

/**
 * Imprime una etiqueta sin abrir pestañas: se carga en un recuadro pequeño dentro de la página
 * y se manda a la impresora. Con Chrome en «impresión directa» (--kiosk-printing) ni siquiera
 * aparece el diálogo. El recuadro deja verla o reimprimirla y se cierra solo.
 */
export function printLabel(url: string, title: string) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { url, title } }));
}

export function PrintToast() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const seq = useRef(0);

  useEffect(() => {
    const onJob = (e: Event) => {
      const { url, title } = (e as CustomEvent<{ url: string; title: string }>).detail;
      const id = ++seq.current;
      setJobs((j) => [...j.slice(-3), { id, url, title, status: "printing" }]);
      // Se cierra solo pasado un rato.
      setTimeout(() => setJobs((j) => j.filter((x) => x.id !== id)), 9000);
    };
    window.addEventListener(EVENT, onJob);
    return () => window.removeEventListener(EVENT, onJob);
  }, []);

  if (!jobs.length) return null;
  const last = jobs[jobs.length - 1];
  // Solo se ve el último; los anteriores siguen cargados fuera de la vista hasta terminar de imprimir.
  return (
    <div className="fixed right-4 top-20 z-[60] w-72 print:hidden max-lg:bottom-24 max-lg:top-auto">
      {jobs.map((job) => (
        <div key={job.id} className={job.id === last.id ? "" : "pointer-events-none absolute -left-[9999px] top-0"} aria-hidden={job.id !== last.id}>
          <JobCard job={job} onClose={() => setJobs((j) => j.filter((x) => x.id !== job.id))} onDone={() => setJobs((j) => j.map((x) => (x.id === job.id ? { ...x, status: "done" } : x)))} />
        </div>
      ))}
    </div>
  );
}

function JobCard({ job, onClose, onDone }: { job: Job; onClose: () => void; onDone: () => void }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const printed = useRef(false);
  const embedUrl = `${job.url}${job.url.includes("?") ? "&" : "?"}embed=1`;

  const print = () => {
    try {
      frame.current?.contentWindow?.focus();
      frame.current?.contentWindow?.print();
    } catch {
      window.open(job.url, "_blank");
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl bg-ink-900 text-white shadow-2xl ring-1 ring-white/10">
      <div className="flex items-center gap-2 px-3 py-2 text-sm">
        <Printer className="h-4 w-4 shrink-0 text-brand-400" />
        <span className="min-w-0 flex-1 truncate font-semibold">{job.title}</span>
        <span className={job.status === "printing" ? "h-2 w-2 shrink-0 animate-pulse rounded-full bg-brand-400" : "h-2 w-2 shrink-0 rounded-full bg-mint-500"} title={job.status === "printing" ? "Imprimiendo…" : "Enviada a la impresora"} />
        <button onClick={onClose} className="rounded-md p-1 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Cerrar">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex gap-3 bg-white/5 px-3 pb-3 pt-1">
        <iframe
          ref={frame}
          src={`${embedUrl}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`}
          title={`Etiqueta ${job.title}`}
          className="h-24 w-16 shrink-0 rounded bg-white"
          onLoad={() => {
            if (printed.current) return;
            printed.current = true;
            // El visor de PDF necesita un instante tras cargar.
            setTimeout(() => {
              print();
              onDone();
            }, 600);
          }}
        />
        <div className="flex flex-1 flex-col justify-center gap-1.5">
          <a href={job.url} target="_blank" className="flex items-center justify-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20">
            <Eye className="h-3.5 w-3.5" /> Ver
          </a>
          <button onClick={print} className="flex items-center justify-center gap-1.5 rounded-lg bg-brand-400 px-3 py-2 text-xs font-semibold text-ink-900 hover:bg-brand-300">
            <Printer className="h-3.5 w-3.5" /> Reimprimir
          </button>
        </div>
      </div>
    </div>
  );
}
