/**
 * Plans barrel export
 * 
 * Import all plans to automatically register them.
 * Add new plans here to make them available.
 */

// Import plans to trigger registration
import './default';
import './linkedin';
import './company';

// Export for direct access if needed
export { defaultPlan } from './default';
export { linkedinPlan } from './linkedin';
export { companyPlan } from './company';
