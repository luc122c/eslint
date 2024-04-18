import { fileURLToPath } from 'node:url'
import { resolvePath } from 'mlly'
import type { Nuxt } from '@nuxt/schema'
import { join, dirname } from 'pathe'
import { getPort } from 'get-port-please'

export async function setupDevToolsIntegration(nuxt: Nuxt) {
  let viewerProcess: ReturnType<typeof import('@nuxt/devtools-kit')['startSubprocess']> | undefined
  let viewerPort: number | undefined
  let viewerUrl: string | undefined

  nuxt.hook('devtools:customTabs', (tabs) => {
    tabs.push({
      name: 'eslint-config',
      title: 'ESLint Config',
      icon: 'https://raw.githubusercontent.com/eslint/config-inspector/main/app/public/favicon.svg',
      view: viewerUrl
        ? {
            type: 'iframe',
            src: viewerUrl,
          }
        : {
            type: 'launch',
            description: 'Start ESLint config inspector to analyze the local ESLint configs',
            actions: [
              {
                label: 'Launch',
                pending: !!viewerProcess,
                handle: async () => {
                  const { startSubprocess } = await import('@nuxt/devtools-kit')
                  const inspectorBinPath = join(
                    dirname(await resolvePath(
                      '@eslint/config-inspector/package.json',
                      { url: dirname(fileURLToPath(import.meta.url)) },
                    )),
                    'bin.mjs',
                  )

                  viewerPort = await getPort({
                    port: 8123,
                    portRange: [8123, 10000],
                  })
                  viewerProcess = startSubprocess(
                    {
                      command: 'node',
                      args: [inspectorBinPath, '--no-open'],
                      cwd: nuxt.options.rootDir,
                      env: {
                        PORT: viewerPort.toString(),
                      },
                    },
                    {
                      id: 'eslint-config-inspector',
                      name: 'ESLint Config Viewer',
                    },
                    nuxt,
                  )
                  nuxt.callHook('devtools:customTabs:refresh')

                  // Wait for viewer to be ready
                  const url = `http://localhost:${viewerPort}`
                  for (let i = 0; i < 100; i++) {
                    if (await fetch(url).then(r => r.ok).catch(() => false))
                      break
                    await new Promise(resolve => setTimeout(resolve, 500))
                  }
                  await new Promise(resolve => setTimeout(resolve, 2000))
                  viewerUrl = url
                },
              },
            ],
          },
    })
  })
}
