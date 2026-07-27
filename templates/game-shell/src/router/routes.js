// Single route — this is a shipped game, not a multi-page editor. All the
// bootstrapping (assembling the project data + calling story.loadProject())
// happens in GamePage.vue itself, synchronously before PhoneShell mounts.
const routes = [
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    children: [{ path: '', component: () => import('../pages/GamePage.vue') }]
  }
]

export default routes
