/** Authorization header for customer JWT (`localStorage.token`). */
export function getCustomerAuthHeaders() {
  const token = localStorage.getItem("token")?.trim();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}
