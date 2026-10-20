import { useUserStore } from '../../store/modules/user'
import { App, Directive, DirectiveBinding } from 'vue'

export type RolesDirective = Directive<HTMLElement, string | string[]>

function checkRolePermission(el: HTMLElement, binding: DirectiveBinding<string | string[]>): void {
  const userStore = useUserStore()
  const userRoles = userStore.getUserInfo.roles

  if (!userRoles?.length) {
    removeElement(el)
    return
  }

  const requiredRoles = Array.isArray(binding.value) ? binding.value : [binding.value]

  const hasPermission = requiredRoles.some((role: string) => userRoles.includes(role))

  if (!hasPermission) {
    removeElement(el)
  }
}

function removeElement(el: HTMLElement): void {
  if (el.parentNode) {
    el.parentNode.removeChild(el)
  }
}

const rolesDirective: RolesDirective = {
  mounted: checkRolePermission,
  updated: checkRolePermission
}

export function setupRolesDirective(app: App): void {
  app.directive('roles', rolesDirective)
}
