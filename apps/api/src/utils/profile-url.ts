import { ProfileSource, ResolvedProfile } from '../types/icp';

const GITHUB_HANDLE_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
const LINKEDIN_HANDLE_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-]{2,99}$/;

export class ProfileUrlError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export const parseProfileUrl = (rawUrl: string): ResolvedProfile => {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch (err) {
    throw new ProfileUrlError('Invalid URL');
  }

  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split('/').filter(Boolean);

  // LinkedIn profile
  if (host.includes('linkedin.com')) {
    const candidate = segments[0] === 'in' ? segments[1] : segments[0];
    const handle = candidate?.split('?')[0];

    if (!handle) {
      throw new ProfileUrlError('LinkedIn profile handle not found');
    }

    if (!LINKEDIN_HANDLE_REGEX.test(handle)) {
      throw new ProfileUrlError('Invalid LinkedIn handle format');
    }

    return {
      source: 'linkedin' as ProfileSource,
      handle,
      profileUrl: `https://www.linkedin.com/in/${handle}`,
      name: null
    };
  }

  // GitHub profile
  if (host === 'github.com' || host.endsWith('.github.com')) {
    const handle = segments[0];

    if (!handle) {
      throw new ProfileUrlError('GitHub username not found');
    }

    if (!GITHUB_HANDLE_REGEX.test(handle)) {
      throw new ProfileUrlError('Invalid GitHub username format');
    }

    return {
      source: 'github' as ProfileSource,
      handle,
      profileUrl: `https://github.com/${handle}`,
      name: null
    };
  }

  throw new ProfileUrlError('Only LinkedIn or GitHub profile URLs are supported');
};
