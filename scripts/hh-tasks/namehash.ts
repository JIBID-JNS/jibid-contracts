import namehash from 'eth-ens-namehash'
import { keccak256 } from 'ethers/lib/utils'
console.log(
  namehash.hash(
    '56383284028158523858701308322023668047170477115967827945969903143589491406224',
  ),
)
console.log(namehash.hash('jibswap.eth'))
console.log(namehash.hash('jib'))
console.log(namehash.hash('eth'))
console.log(namehash.hash('reverse'))
console.log(namehash.hash('green.jib'))
console.log(namehash.hash('green.eth'))
console.log(namehash.hash('greenrenge'))
console.log(namehash.hash('greenrenge.eth'))
console.log(namehash.hash('greenrenge.jib'))
// console.log(namehash.hash('reverse'))
// console.log(namehash.hash('jibid-deployer.jib'))
// console.log(namehash.hash('greenrenge.eth'))
// console.log(namehash.hash('greenrenge.jib'))

// console.log(keccak256('jib'))
// keccak256('eth')
// keccak256('reverse')
