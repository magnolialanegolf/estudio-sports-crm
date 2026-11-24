"use client";

import { useRouter } from "next/navigation";
import { marcarAvisoLeido } from "@/actions/avisos";

export function AbrirAviso({ id, href, texto, leido }: { id: string; href: string; texto: string; leido: boolean }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        if (!leido) await marcarAvisoLeido(id);
        router.push(href);
      }}
      className={`text-left text-sm hover:underline ${leido ? "text-tinta-2" : "font-medium text-tinta"}`}
    >
      {texto}
    </button>
  );
}
