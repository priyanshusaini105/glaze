/**
 * Email Validation Utility
 * 
 * Validates that emails are from company domains, blocking:
 * - Personal email providers (gmail, yahoo, outlook, etc.)
 * - Temporary/disposable email providers
 */

// Common personal email domains to block
const PERSONAL_EMAIL_DOMAINS = new Set([
    // Google
    'gmail.com',
    'googlemail.com',

    // Microsoft
    'outlook.com',
    'hotmail.com',
    'live.com',
    'msn.com',
    'hotmail.co.uk',
    'outlook.co.uk',

    // Yahoo
    'yahoo.com',
    'yahoo.co.uk',
    'yahoo.co.in',
    'ymail.com',
    'rocketmail.com',

    // Apple
    'icloud.com',
    'me.com',
    'mac.com',

    // Other major providers
    'aol.com',
    'protonmail.com',
    'proton.me',
    'zoho.com',
    'mail.com',
    'gmx.com',
    'gmx.net',
    'yandex.com',
    'yandex.ru',
    'qq.com',
    '163.com',
    '126.com',
    'sina.com',
    'rediffmail.com',
    'fastmail.com',
    'tutanota.com',
    'tutamail.com',
    'hey.com',

    // Regional providers
    'web.de',
    'freenet.de',
    'libero.it',
    'virgilio.it',
    'laposte.net',
    'orange.fr',
    'wanadoo.fr',
    'seznam.cz',
    'wp.pl',
    'o2.pl',
    'interia.pl',
    'rambler.ru',
    'mail.ru',
    'inbox.ru',
    'list.ru',
    'bk.ru',
]);

// Temporary/disposable email domains to block
const TEMP_EMAIL_DOMAINS = new Set([
    // Popular temp mail services
    'tempmail.com',
    'temp-mail.org',
    'guerrillamail.com',
    'guerrillamail.org',
    'guerrillamail.net',
    'sharklasers.com',
    'grr.la',
    'guerrillamailblock.com',
    'pokemail.net',
    'spam4.me',

    // 10 Minute Mail variants
    '10minutemail.com',
    '10minutemail.net',
    '10minutemail.org',
    '10minemail.com',
    'tempinbox.com',

    // Mailinator and variants
    'mailinator.com',
    'mailinater.com',
    'mailinator2.com',
    'mailinatorapp.com',

    // Other disposable services
    'throwaway.email',
    'throwawaymail.com',
    'getnada.com',
    'getairmail.com',
    'mohmal.com',
    'tempail.com',
    'fakemailgenerator.com',
    'emailondeck.com',
    'dispostable.com',
    'mailcatch.com',
    'yopmail.com',
    'yopmail.fr',
    'cool.fr.nf',
    'jetable.fr.nf',
    'nospam.ze.tc',
    'nomail.xl.cx',
    'mega.zik.dj',
    'speed.1s.fr',
    'courriel.fr.nf',
    'moncourrier.fr.nf',
    'monemail.fr.nf',
    'monmail.fr.nf',
    'emailtemporaire.fr',
    'emailtemporaire.com',

    // Other known disposable domains
    'trashmail.com',
    'trashmail.net',
    'trashmail.org',
    'trashemail.de',
    'spamgourmet.com',
    'spambox.us',
    'spamfree24.org',
    'spamherelots.com',
    'spamobox.com',
    'spam.la',
    'spamify.com',
    'tempr.email',
    'discard.email',
    'discardmail.com',
    'mintemail.com',
    'mt2009.com',
    'mytrashmail.com',
    'thankyou2010.com',
    'trash2009.com',
    'maildrop.cc',
    'mailsac.com',
    'burnermail.io',
    'dropmail.me',
    'tempsky.com',
    'emkei.cz',
    'fakeinbox.com',
    'mailnesia.com',
    'nextstep.name',
    'tempemailaddress.com',
    'temp.email',
    'temp-mail.io',
    'tempmailaddress.com',
    'tmpmail.org',
    'tmpmail.net',
    'anonymousemail.me',
    'anonymbox.com',
]);

/**
 * Extract the domain from an email address
 */
function getEmailDomain(email: string): string {
    const parts = email.toLowerCase().trim().split('@');
    return parts.length === 2 ? parts[1] : '';
}

/**
 * Check if an email is from a personal email provider
 */
export function isPersonalEmail(email: string): boolean {
    const domain = getEmailDomain(email);
    return PERSONAL_EMAIL_DOMAINS.has(domain);
}

/**
 * Check if an email is from a temporary/disposable email provider
 */
export function isTempEmail(email: string): boolean {
    const domain = getEmailDomain(email);
    return TEMP_EMAIL_DOMAINS.has(domain);
}

/**
 * Check if an email is from a company domain
 * Returns true if the email is NOT from a personal or temp provider
 */
export function isCompanyEmail(email: string): boolean {
    const domain = getEmailDomain(email);
    if (!domain) return false;

    // Check it's not personal or temp
    if (PERSONAL_EMAIL_DOMAINS.has(domain)) return false;
    if (TEMP_EMAIL_DOMAINS.has(domain)) return false;

    return true;
}

/**
 * Get validation error message for an email, or null if valid
 */
export function getEmailValidationError(email: string): string | null {
    if (!email || !email.includes('@')) {
        return 'Please enter a valid email address.';
    }

    const domain = getEmailDomain(email);
    if (!domain) {
        return 'Please enter a valid email address.';
    }

    if (PERSONAL_EMAIL_DOMAINS.has(domain)) {
        return 'Personal email addresses are not allowed. Please use your company email.';
    }

    if (TEMP_EMAIL_DOMAINS.has(domain)) {
        return 'Temporary or disposable email addresses are not allowed. Please use your company email.';
    }

    return null;
}

/**
 * Get all blocked domains (for reference/debugging)
 */
export function getBlockedDomains(): { personal: string[]; temp: string[] } {
    return {
        personal: Array.from(PERSONAL_EMAIL_DOMAINS),
        temp: Array.from(TEMP_EMAIL_DOMAINS),
    };
}
