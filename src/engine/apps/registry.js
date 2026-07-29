// Single source of truth for the phone's built-in apps — component to
// render, home-screen icon/color, unread badge, i18n label key. Every place
// that used to keep its own hardcoded copy of this list (PhoneShell.vue's
// component map, HomeScreen.vue's icon grid, SetupWizard.vue's fake
// "syncing accounts" animation) now reads from here instead, so a project
// disabling an app (game.disabledApps, see GameForm.vue's "Applications"
// panel and story.js's enabledAppIds getter) only has to be taught to this
// one array — and it's the seed of a future real app-plugin registry
// (docs/roadmap-modular-apps-events.md), not a detour from it.
import MessagesApp from '@/components/apps/messages/MessagesApp.vue'
import SocialApp from '@/components/apps/social/SocialApp.vue'
import GalleryApp from '@/components/apps/gallery/GalleryApp.vue'
import CallsApp from '@/components/apps/calls/CallsApp.vue'
import SettingsApp from '@/components/apps/settings/SettingsApp.vue'

export const APP_REGISTRY = [
  {
    id: 'messages',
    labelKey: 'home.apps.messages',
    icon: 'sms',
    color: '#4caf50',
    component: MessagesApp,
    badge: (story) => story.totalUnread || 0,
  },
  {
    id: 'social',
    labelKey: 'home.apps.social',
    icon: 'photo_camera',
    color: 'linear-gradient(135deg,#f093fb,#f5576c)',
    component: SocialApp,
    badge: (story) => story.totalDmUnread || 0,
  },
  {
    id: 'gallery',
    labelKey: 'home.apps.gallery',
    icon: 'image',
    color: 'linear-gradient(135deg,#ffb300,#f4511e,#8e24aa,#1e88e5)',
    component: GalleryApp,
    badge: () => 0,
  },
  {
    id: 'calls',
    labelKey: 'home.apps.calls',
    icon: 'call',
    color: '#8bc34a',
    component: CallsApp,
    badge: (story) => (story.pendingCall ? 1 : 0),
  },
  {
    id: 'settings',
    labelKey: 'home.apps.settings',
    icon: 'settings',
    color: '#8e8e93',
    component: SettingsApp,
    badge: () => 0,
  },
]
