import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";
import ModelPage from "@/pages/ModelPage.vue";

const routes: RouteRecordRaw[] = [
  { path: "/model", name: "Model", component: ModelPage },
  { path: "/:pathMatch(.*)*", redirect: "/model" },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
