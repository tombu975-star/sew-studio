import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import SuppliersTab from '@/components/contacts/SuppliersTab';
import ArtisansTab from '@/components/contacts/ArtisansTab';

export default function Contacts() {
  return (
    <div className="p-5 md:p-8 max-w-[900px] mx-auto">
      <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400 mb-2">Who You Buy From & Who Fixes Things</p>
      <h1 className="font-display font-semibold text-[#1C1917] leading-none" style={{ fontSize: 'clamp(28px, 4vw, 38px)' }}>Contacts</h1>
      <p className="text-sm text-stone-500 mt-2">Suppliers you buy materials from, and artisans who service your equipment.</p>

      <Tabs defaultValue="suppliers" className="mt-6">
        <TabsList className="rounded-sm">
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="artisans">Artisans</TabsTrigger>
        </TabsList>
        <TabsContent value="suppliers" className="mt-4"><SuppliersTab /></TabsContent>
        <TabsContent value="artisans" className="mt-4"><ArtisansTab /></TabsContent>
      </Tabs>
    </div>
  );
}