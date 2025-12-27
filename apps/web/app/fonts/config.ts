import localFont from 'next/font/local';

export const urbaneRounded = localFont({
  src: [
    {
      path: '../../public/fonts/urbane-rounded/UrbaneRounded-Thin.woff2',
      weight: '100',
      style: 'normal',
    },
    {
      path: '../../public/fonts/urbane-rounded/UrbaneRounded-ExtraLight.woff2',
      weight: '200',
      style: 'normal',
    },
    {
      path: '../../public/fonts/urbane-rounded/UrbaneRounded-Light.woff2',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../../public/fonts/urbane-rounded/UrbaneRounded-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../public/fonts/urbane-rounded/UrbaneRounded-DemiBold.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../../public/fonts/urbane-rounded/UrbaneRounded-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../../public/fonts/urbane-rounded/UrbaneRounded-Heavy.woff2',
      weight: '800',
      style: 'normal',
    },
  ],
  variable: '--font-urbane',
  display: 'swap',
});
