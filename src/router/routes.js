const routes = [
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      { path: '', name: 'open-project', component: () => import('@/editor/pages/OpenProjectPage.vue') },
      { path: 'editor', name: 'editor', component: () => import('@/editor/pages/EditorPage.vue') },
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('@/pages/ErrorNotFound.vue'),
  },
]

export default routes
