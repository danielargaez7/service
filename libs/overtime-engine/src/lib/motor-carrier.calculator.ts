/**
 * Motor Carrier Act Exemption (FLSA Section 13(b)(1))
 *
 * Employees who are drivers, driver's helpers, loaders, or mechanics
 * whose duties affect the safety of operation of motor vehicles in
 * interstate or foreign commerce are exempt from FLSA overtime.
 *
 * In the ServiceCore context, CDL_A and CDL_B drivers operating
 * vehicles over 10,000 lbs GVWR in interstate commerce qualify.
 */

const MOTOR_CARRIER_EXEMPT_CLASSES = new Set([
  'CDL_A',
  'CDL_B',
]);

export function isMotorCarrierExempt(employeeClass: string): boolean {
  return MOTOR_CARRIER_EXEMPT_CLASSES.has(employeeClass);
}
