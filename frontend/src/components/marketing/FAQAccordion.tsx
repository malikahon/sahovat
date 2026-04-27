'use client';

import * as React from 'react';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';

export interface FAQEntry {
  id: string;
  q: string;
  a: string;
}

interface FAQAccordionProps {
  items: FAQEntry[];
  /** Allow only one item open at a time. Default: false (multi-open). */
  exclusive?: boolean;
}

export function FAQAccordion({ items, exclusive = false }: FAQAccordionProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <Accordion multiple={!exclusive}>
      {items.map((item) => (
        <AccordionItem key={item.id} value={item.id}>
          <AccordionTrigger>{item.q}</AccordionTrigger>
          <AccordionContent>
            <p className="whitespace-pre-line">{item.a}</p>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
