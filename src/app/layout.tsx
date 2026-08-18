import type {Metadata} from 'next';import '@/styles/globals.css';import '@/styles/xp.css';import '@/styles/msn.css';import '@/styles/recovery.css';import '@/styles/nudge.css';import '@/styles/volume.css';import '@/styles/viewport.css';
export const metadata:Metadata={title:'Project Sleepless',description:'This computer has not been online since 2005. One contact is still online.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
