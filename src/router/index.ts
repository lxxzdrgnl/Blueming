import { createRouter, createWebHistory } from 'vue-router';
import ModelList from '../views/ModelList.vue';
import ModelDetail from '../views/ModelDetail.vue';
import Login from '../views/Login.vue';
import Profile from '../views/Profile.vue';
import Search from '../views/Search.vue';
import Training from '../views/Training.vue';
import Generate from '../views/Generate.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: ModelList,
    },
    {
      path: '/models',
      name: 'models',
      component: ModelList,
    },
    {
      path: '/models/:id',
      name: 'model-detail',
      component: ModelDetail,
    },
    {
      path: '/search',
      name: 'search',
      component: Search,
    },
    {
      path: '/generate',
      name: 'generate',
      component: Generate,
    },
    {
      path: '/training',
      name: 'training',
      component: Training,
    },
    {
      path: '/login',
      name: 'login',
      component: Login,
    },
    {
      path: '/profile',
      name: 'profile',
      component: Profile,
    },
    {
      path: '/my-models',
      name: 'my-models',
      component: Profile,
    },
    {
      path: '/favorites',
      name: 'favorites',
      component: Profile,
    },
  ],
});

export default router;
