<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <ClientOnly>
    <Toaster richColors position="top-right" />
  </ClientOnly>
</template>

<script setup lang="ts">
import { Toaster } from 'vue-sonner';
</script>
