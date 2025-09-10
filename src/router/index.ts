import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";
import MapPage from "@/pages/MapPage.vue";

const routes: RouteRecordRaw[] = [
  { path: "/map", name: "Map", component: MapPage },
  { path: "/:pathMatch(.*)*", redirect: "/map" },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
