import { BasePlugin, PluginConstructor } from '../core/plugins/interface.js'

export function makeTestPluginClass(
  id: string,
  options?: { dependencies?: string[]; autoEnable?: boolean; on?: Partial<{ init: () => void | Promise<void>; enable: () => void | Promise<void>; disable: () => void | Promise<void>; uninstall: () => void | Promise<void>; }> }
): PluginConstructor {
  const deps = options?.dependencies ?? []
  const autoEnable = options?.autoEnable ?? true
  const hooks = options?.on ?? {}

  return class extends BasePlugin {
    constructor() {
      super({ id, name: `Test Plugin ${id}`, version: '1.0.0', dependencies: deps, autoEnable })
    }

    protected async onInitialize(): Promise<void> { await hooks.init?.() }
    protected async onEnable(): Promise<void> { await hooks.enable?.() }
    protected async onDisable(): Promise<void> { await hooks.disable?.() }
    protected async onUninstall(): Promise<void> { await hooks.uninstall?.() }
  }
} 