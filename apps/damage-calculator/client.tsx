import { createRoot } from 'react-dom/client';
import Page from '@/app/page';
import { TooltipProvider } from '@/components/ui/tooltip';
import '@/app/globals.css';

// The Next.js layout is replaced by index.html + this entry; the tooltip
// provider it wrapped around the page still belongs here.
createRoot(document.getElementById('root')!).render(
  <TooltipProvider delay={150}>
    <Page />
  </TooltipProvider>,
);
