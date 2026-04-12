// ── ERC-165 / ERC-2535 ──

/** ERC-165 `supportsInterface(bytes4)`. */
export const SUPPORTS_INTERFACE_SELECTOR = '0x01ffc9a7'

/** ERC-2535 Diamond Loupe `IDiamondLoupe` interface ID. */
export const DIAMOND_LOUPE_INTERFACE_ID = '0x48e2b093'

/** ERC-2535 `facets()` — returns `(address, bytes4[])[]`. */
export const FACETS_SELECTOR = '0x7a0ed627'

/** `implementation()` — used by EIP-897 proxies and EIP-1967 beacons. */
export const IMPLEMENTATION_SELECTOR = '0x5c60da1b'

// ── EIP-1967 storage slots ──
// Per EIP-1967, slots are `bytes32(uint256(keccak256('eip1967.proxy.<field>')) - 1)`.

/** EIP-1967 implementation slot: `keccak256('eip1967.proxy.implementation') - 1`. */
export const EIP1967_IMPL_SLOT = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'

/** EIP-1967 beacon slot: `keccak256('eip1967.proxy.beacon') - 1`. */
export const EIP1967_BEACON_SLOT = '0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50'

/** EIP-1967 admin slot: `keccak256('eip1967.proxy.admin') - 1`. */
export const EIP1967_ADMIN_SLOT = '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103'

// ── EIP-1822 ──

/** EIP-1822 UUPS PROXIABLE slot: `keccak256('PROXIABLE')`. */
export const EIP1822_PROXIABLE_SLOT = '0xc5f16f0fcc7e328891200cdca4c1c57b2b360c12265401510d42209b5829f8e2'

// ── EIP-1167 minimal-proxy bytecode markers ──
// Reference: https://eips.ethereum.org/EIPS/eip-1167
// Runtime: 0x363d3d373d3d3d363d73<20-byte impl>5af43d82803e903d91602b57fd5bf3 (45 bytes = 90 hex chars)

/** Prefix preceding the 20-byte implementation address in an EIP-1167 minimal proxy. */
export const EIP1167_BYTECODE_PREFIX = '363d3d373d3d3d363d73'

/** Suffix following the 20-byte implementation address in an EIP-1167 minimal proxy. */
export const EIP1167_BYTECODE_SUFFIX = '5af43d82803e903d91602b57fd5bf3'

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
