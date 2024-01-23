import fsp from 'fs/promises'
import { Deployment } from 'hardhat-deploy/types'
import { task } from 'hardhat/config'
import path from 'path'

/*
  {
    ...
    "settings": {
      "compilationTarget": {
        "contracts/A.sol": "A"
        "contracts/B.sol": "B"
      }
      ...
    }
    ...
  }
 */
type Metadata = {
  settings: {
    compilationTarget: Record<string, string>
  }
}
interface DeploymentMetadata extends Omit<Deployment, 'metadata'> {
  metadata: Metadata
}

type Summary = {
  address: string
  contract: string
  args: any[]
  libraries: Record<string, string>
}

task(
  'verify-contracts',
  'Verify all contracts available in deployments',
).setAction(async (_, hre, _runSuper) => {
  const network = hre.network.name
  console.log(`Verify all contracts deployed on network: ${network}`)

  const deploymentsDir = path.resolve(
    __dirname,
    '..',
    '..',
    'deployments',
    network,
  )

  try {
    const readdir = await fsp.readdir(deploymentsDir)
    const jsons = readdir.filter((n) => n.endsWith('.json'))

    const noLibRegex = RegExp(
      `You gave an address for the library ([a-zA-Z1-9_\-]+) in the libraries dictionary, which is not one of the libraries of contract`,
    )

    let deployments: Record<string, DeploymentMetadata & { summary: Summary }> =
      {}
    for (const json of jsons) {
      const name = json.slice(0, -5)

      const jsonPath = path.resolve(deploymentsDir, json)
      const content = await fsp.readFile(jsonPath)
      const deployment: Deployment = JSON.parse(content.toString())

      if (!deployment.metadata) {
        console.error(
          `Skip ${name}, metadata not available in ${jsonPath}:.metadata`,
        )
        continue
      }
      const metadata: Metadata = JSON.parse(deployment.metadata!)

      const paths = Object.entries(metadata.settings.compilationTarget)
      if (paths.length < 1) {
        console.error(
          `Skip ${name}, contract path not available in ${jsonPath}:.metadata:.settings.compilationTarget`,
        )
        continue
      }

      deployments[name] = deployment as any
      deployments[name].metadata = metadata
      deployments[name].summary = {
        contract: `${paths[0][0]}:${paths[0][1]}`,
        address: deployment.address,
        args: deployment.args ?? [],
        libraries: deployment.libraries ?? {},
      }
    }

    for (const [name, deployment] of Object.entries(deployments)) {
      const { address, contract, args, libraries } = deployment.summary
      const maxAttempts = Object.keys(libraries).length + 5

      console.log(
        `Verifying contract ${name} (${contract}) at ${address} with ${
          args.length
        } argument(s) and ${
          Object.keys(libraries).length
        } lib(s) (w/ maximum attempts: ${maxAttempts})`,
      )
      const verify = async (
        {
          address,
          args,
          contract,
          libraries,
        }: {
          address: string
          args: any[]
          contract: string
          libraries: Record<string, string>
        },
        attempts: number = 0,
      ) => {
        try {
          await hre.run('verify:verify', {
            address,
            constructorArguments: args,
            contract,
            libraries,
          })
          attempts = 0
        } catch (error) {
          if (attempts >= maxAttempts) {
            throw error
          }
          let stack: string[] = ((error as any)?._stack || '').split('\n')

          /// Remove optional libraries
          while (true) {
            const noOptionalLibs = stack.findIndex(
              (v) =>
                v ===
                "Libraries marked as optional don't need to be specified since their addresses are autodetected by the plugin.",
            )
            delete stack[noOptionalLibs]
            if (noOptionalLibs !== -1) {
              const libs = []
              let ptr = noOptionalLibs - 1
              let msg = stack[ptr] || ''
              while (true) {
                if (msg.startsWith('  * ') && msg.endsWith(' (optional)')) {
                  const lib = msg
                    .replace('  * ', '')
                    .replace(' (optional)', '')
                    .split(':')
                    .at(-1)
                  if (lib) libs.push(lib)
                  delete stack[ptr]
                } else if (msg === '') break
                msg = stack[ptr] || ''
              }
              for (const lib of libs) {
                delete libraries[lib]
              }
            } else break
          }

          /// Remove libraries
          while (true) {
            const noLib = stack.findIndex(
              (v) =>
                !!v &&
                v.includes(
                  ` in the libraries dictionary, which is not one of the libraries of contract ${name}`,
                ),
            )
            if (noLib !== -1) {
              const msg = stack[noLib]
              const match = msg.match(noLibRegex)
              if (match) {
                delete libraries[match[1]]
              }
              delete stack[noLib]
            } else break
          }
        }
      }

      await verify({
        address,
        args,
        contract,
        libraries,
      })
    }
  } catch (error) {
    if ((error as any)?.code !== 'ENOENT') {
      throw error
    } else {
      console.log('No contracts found.')
    }
  }
})
