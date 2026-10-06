import { useState, type CSSProperties } from 'react';
import {
  ArrowRight,
  LayoutGrid,
  Package,
  Compass,
  Home,
  Smile,
  Signpost,
} from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { countText, parseRichText } from '@/lib/rich-text';
import {
  signTemplates,
  templateCategories,
  templateText,
  type SignTemplate,
} from '@/lib/templates';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const categoryIcons = [Package, Compass, Signpost, Home, Smile];

export function TemplateCard({
  template,
  onChoose,
}: {
  template: SignTemplate;
  onChoose: (template: SignTemplate) => void;
}) {
  const { t, tn } = useLanguage();
  const source = templateText(template, t);
  const preview = parseRichText(source, t);
  const Icon = categoryIcons[templateCategories.indexOf(template.category)];
  return (
    <button
      type="button"
      className="template-card"
      onClick={() => onChoose(template)}
      style={{ '--template-color': template.color } as CSSProperties}
    >
      <span className="template-top">
        <Icon size={17} />
        <span>{t(template.name)}</span>
        <ArrowRight size={16} />
      </span>
      <strong dir="auto">
        {preview.runs.map((run, index) => (
          <span key={index} style={run.style as CSSProperties}>
            {run.text}
          </span>
        ))}
      </strong>
      <small>
        {tn('{count}/50 characters', countText(source).units)}
      </small>
    </button>
  );
}

export function TemplateGallery({
  onChoose,
}: {
  onChoose: (template: SignTemplate) => void;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="quiet-button">
        <LayoutGrid size={16} /> {t('Templates')}
      </DialogTrigger>
      <DialogContent
        className="guide-dialog template-dialog"
        closeLabel={t('Zavřít')}
      >
        <DialogHeader>
          <DialogTitle>{t('Templates')}</DialogTitle>
          <DialogDescription>
            {t(
              'Choose a sign to replace your text and formatting. All templates fit Vanilla.',
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="guide-scroll template-scroll">
          {templateCategories.map((category) => (
            <section className="template-category" key={category}>
              <h3>{t(category)}</h3>
              <div className="template-grid">
                {signTemplates
                  .filter((template) => template.category === category)
                  .map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onChoose={(chosen) => {
                        onChoose(chosen);
                        setOpen(false);
                      }}
                    />
                  ))}
              </div>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
