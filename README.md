# 🎓 SGD — Sistema de Gestión Documental (Proyecto de Tesis)

> Plataforma web para gestionar expedientes municipales con trazabilidad completa, tiempo real y buenas prácticas.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-Runtime-black)](https://bun.sh/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)](https://www.mongodb.com/)

---

## 📌 Resumen

SGD es un sistema pensado para la administración pública local que permite:

- Registrar expedientes y darles seguimiento durante todo su ciclo de vida.
- Enviar/recepcionar entre despachos con historial de movimientos y estados.
- Notificar en tiempo real (WS) y conversar por Inbox entre despachos.
- Gestionar organismos (despachos), usuarios y temas desde un panel de “Gestión Admin”.

El diseño y las decisiones técnicas se alinean con los objetivos académicos de la tesis: arquitectura clara, tipada, escalable y con foco en experiencia de uso.

---

## 🧩 Módulos principales

- **Expedientes**: creación, búsqueda avanzada, timeline de movimientos; estados: `REGISTRADO`, `ENVIADO`, `RECEPCIONADO`, `ARCHIVADO`.
- **Movimientos**: derivaciones entre despachos con suma de fojas y auditoría.
- **Recepción y Archivo**: bandejas dedicadas con acciones rápidas.
- **Inbox**: mensajería entre despachos con hilos, lectura y WS en vivo.
- **Notificaciones**: campana con contador, leídos/no leídos y filtrado por despacho.
- **Gestión Admin**: alta/edición de Despachos, Usuarios y Temas.

---

## 🏗️ Arquitectura y tecnologías

- **Backend (SGD-BACKEND)**: Bun + Hono (TypeScript), MongoDB/Mongoose, Zod, JWT, WS (`wsHub`), logging estructurado. Patrón de capas: `database → services → http`.
- **Frontend (SGD-FRONTEND)**: Next.js 14, React 18, Chakra UI, Axios, WebSocket, `jwt-decode`. UI responsiva “mobile‑first”.
- **Tiempo real**: canales WebSocket segmentados (`notifications:<despachoId>`, `inbox`).
- **Validación**: Zod (DTOs y middlewares); respuestas API normalizadas.

---

## 🚀 Puesta en marcha (local)

### Prerrequisitos

- Bun 1.x (backend) y Node 20+ (frontend)
- MongoDB local o Atlas

### Pasos

```bash
# Backend
cd SGD-BACKEND
bun install
bun run dev

# Frontend (otro terminal)
cd SGD-FRONTEND
npm install
npm run dev

# Navegar a
http://localhost:3000
```

Variables típicas: `MONGODB_URL`, `CORS_ORIGIN`, `NEXT_PUBLIC_BACKEND_BASE_URL`.

---

## 📁 Estructura (resumen)

```
├── SGD-BACKEND/   # API (Bun + Hono + MongoDB)
└── SGD-FRONTEND/  # Web (Next.js + Chakra UI)
```

---

## 👤 Autoría

Proyecto de tesis — Lucas Nahuel Rodríguez.  
Tecnologías modernas, arquitectura limpia y enfoque en experiencia de usuario y mantenibilidad.

---
