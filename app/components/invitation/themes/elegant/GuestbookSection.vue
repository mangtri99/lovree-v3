<script setup lang="ts">
import { ref, inject } from "vue";
defineProps<{ content: { title: string } }>();
const entries = inject<any>("guestbook", ref([]));
const label = (a: string | null) =>
  a === "yes"
    ? "Hadir"
    : a === "no"
      ? "Tidak Hadir"
      : a === "maybe"
        ? "Mungkin"
        : "";
</script>
<template>
  <section
    class="px-6 py-16"
    style="background: var(--color-bg); color: var(--color-text)"
  >
    <h2
      class="text-center text-2xl italic"
      style="font-family: var(--font-heading); color: var(--color-primary)"
    >
      {{ content.title }}
    </h2>
    <div
      class="mx-auto my-4 h-px w-16"
      style="background: var(--color-secondary)"
    />
    <p
      v-if="!entries.length"
      class="text-center text-sm"
      style="color: var(--color-secondary)"
    >
      Belum ada ucapan.
    </p>
    <ul class="mx-auto mt-2 max-w-md space-y-3">
      <li
        v-for="(e, i) in entries"
        :key="i"
        class="rounded-lg border p-4"
        style="border-color: var(--color-secondary)"
      >
        <div class="flex items-center gap-2">
          <span class="italic" style="font-family: var(--font-heading)">{{
            e.name
          }}</span>
          <span
            v-if="label(e.attendance)"
            class="text-xs uppercase tracking-wider"
            style="color: var(--color-accent)"
            >{{ label(e.attendance) }}</span
          >
        </div>
        <div class="mt-1 text-sm">{{ e.message }}</div>
      </li>
    </ul>
  </section>
</template>
