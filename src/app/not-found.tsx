import Link from "next/link";

export default function NoEncontrado() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-20">
      <div className="text-center">
        <div className="titulo-marca text-2xl text-acento">Estudio Sports</div>
        <p className="mt-3 text-sm text-tinta-2">El registro no existe o no está en tu cartera.</p>
        <Link href="/" className="mt-4 inline-block text-sm text-acento hover:underline">Volver al inicio</Link>
      </div>
    </main>
  );
}
