/** Market records must be explicitly published from a farmer inventory item. */
export function isInventoryMarketListing(value: any): boolean {
  return value?.is_active === true && typeof value.inventory_id === 'string' && value.inventory_id.trim().length > 0 &&
    typeof value.farmer_id === 'string' && value.farmer_id.trim().length > 0;
}
