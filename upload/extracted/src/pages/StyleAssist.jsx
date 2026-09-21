import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import DesignRequestForm from '@/components/styleassist/DesignRequestForm';
import CustomerStyleSummary from '@/components/styleassist/CustomerStyleSummary';
import ConceptCard from '@/components/styleassist/ConceptCard';

const EMPTY_REQUEST = { garment_type: '', occasion: '', desired_look: '', season: '', budget: '', fabric_available: '', colour_preference: '', designer_direction: '' };

export default function StyleAssist() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [latestSet, setLatestSet] = useState(null);
  const [orders, setOrders] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [savedConcepts, setSavedConcepts] = useState([]);
  const [request, setRequest] = useState(EMPTY_REQUEST);
  const [drafts, setDrafts] = useState([]);
  const [confidence, setConfidence] = useState(null);
  const [confidenceNote, setConfidenceNote] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    base44.entities.Customer.get(id).then(setCustomer).catch(() => setCustomer(null));
    base44.entities.MeasurementSet.filter({ customer_id: id }, '-date_taken', 1).then(r => setLatestSet(r[0] || null));
    base44.entities.Order.filter({ customer_id: id }, '-order_date', 100).then(setOrders);
    base44.entities.CustomerFeedback.filter({ customer_id: id }, '-date', 50).then(setFeedback);
    base44.entities.StyleConcept.filter({ customer_id: id }, '-created_date', 100).then(setSavedConcepts);
  };
  useEffect(load, [id]);

  const customerProfile = useMemo(() => {
    if (!customer) return {};
    return {
      customer_type: customer.customer_type, preferred_styles: customer.preferred_styles,
      favourite_colours: customer.favourite_colours, colours_to_avoid: customer.colours_to_avoid,
      favourite_fabrics: customer.favourite_fabrics, fabrics_to_avoid: customer.fabrics_to_avoid,
      preferred_fit: customer.preferred_fit, fit_characteristics: customer.fit_characteristics,
      design_preferences: customer.design_preferences, style_notes: customer.style_notes,
      designer_fit_observation: customer.designer_fit_observation,
      overall_proportion: customer.overall_proportion, height: latestSet?.height, unit: latestSet?.unit,
      previous_orders: orders.slice(0, 10).map(o => ({ garment: o.garment_design, status: o.status })),
      previous_feedback: feedback.slice(0, 10).map(f => ({ rating: f.rating, feedback: f.feedback, type: f.type })),
      approved_style_history: savedConcepts.filter(c => c.status === 'Approved' || c.status === 'Converted').map(c => ({
        concept_name: c.concept_name, silhouette: c.silhouette, fabric: c.fabric, colour: c.colour,
      })),
      rejected_style_history: savedConcepts.filter(c => c.status === 'Rejected').map(c => ({
        concept_name: c.concept_name, rejection_reason: c.rejection_reason,
      })),
    };
  }, [customer, latestSet, orders, feedback, savedConcepts]);

  const generate = async (excludeName) => {
    setGenerating(true); setError('');
    try {
      const payload = { customerProfile, request: { ...request, budget: Number(request.budget) || undefined, exclude_concept: excludeName || undefined } };
      const res = await base44.functions.invoke('generateStyleConcepts', payload);
      const data = res.data;
      if (data.error) { setError(data.error); return; }
      setConfidence(data.data_confidence); setConfidenceNote(data.confidence_note || '');
      const newDrafts = (data.concepts || []).map((c, i) => ({
        tempId: `draft-${Date.now()}-${i}`, status: 'Suggested',
        concept_name: c.concept_name, silhouette: c.silhouette, neckline: c.neckline, sleeve_style: c.sleeve_style,
        length: c.length, waist_fit: c.waist_fit, fabric: c.fabric, colour: c.colour, detailing: c.detailing,
        embellishment: c.embellishment, print_pattern: c.print_pattern, design_direction: c.design_direction,
        fit_considerations: c.fit_considerations, why_this_may_work: c.why_this_may_work,
        potential_alterations: c.potential_alterations, match_percent: c.style_match_percent, match_breakdown: c.match_breakdown,
      }));
      if (excludeName) {
        setDrafts(prev => [...prev.filter(d => d.concept_name !== excludeName), ...newDrafts.slice(0, 1)]);
      } else {
        setDrafts(newDrafts);
      }
    } catch (e) {
      setError('Could not generate suggestions. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const saveConcept = async (draft, status, rejection_reason) => {
    const record = await base44.entities.StyleConcept.create({
      customer_id: id, garment_type: request.garment_type, occasion: request.occasion, desired_look: request.desired_look,
      season: request.season, budget: Number(request.budget) || undefined, fabric_available: request.fabric_available,
      colour_preference: request.colour_preference, designer_direction: request.designer_direction,
      concept_name: draft.concept_name, silhouette: draft.silhouette, neckline: draft.neckline, sleeve_style: draft.sleeve_style,
      length: draft.length, waist_fit: draft.waist_fit, fabric: draft.fabric, colour: draft.colour, detailing: draft.detailing,
      embellishment: draft.embellishment, print_pattern: draft.print_pattern, design_direction: draft.design_direction,
      fit_considerations: draft.fit_considerations, why_this_may_work: draft.why_this_may_work,
      potential_alterations: draft.potential_alterations, match_percent: draft.match_percent, match_breakdown: draft.match_breakdown,
      data_confidence: confidence, status, rejection_reason,
    });
    setDrafts(prev => prev.filter(d => d.tempId !== draft.tempId));
    setSavedConcepts(prev => [record, ...prev]);
  };

  const convertToOrder = (concept) => {
    const garment = [concept.concept_name, concept.silhouette, concept.fabric, concept.colour].filter(Boolean).join(' — ');
    navigate(`/orders/new?customer=${id}&garment=${encodeURIComponent(garment)}`);
  };

  if (!customer) return <div className="p-10 text-sm text-stone-400">Loading…</div>;

  return (
    <div className="p-5 md:p-8 max-w-[1200px] mx-auto">
      <Link to={`/customers/${id}`} className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-[#800020] mb-5"><ArrowLeft className="w-4 h-4" /> Back to {customer.name}</Link>

      <div className="flex items-center gap-2 mb-5">
        <Sparkles className="w-5 h-5 text-[#800020]" />
        <h1 className="font-display font-semibold text-[#1C1917]" style={{ fontSize: 'clamp(24px, 3.5vw, 30px)' }}>Style Assist</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 space-y-5">
          <CustomerStyleSummary customer={customer} latestSet={latestSet} orders={orders} dataConfidence={confidence} confidenceNote={confidenceNote} />
        </div>
        <div className="lg:col-span-2 space-y-5">
          <DesignRequestForm value={request} onChange={setRequest} onGenerate={() => generate()} generating={generating} />
          {error && <p className="text-sm text-red-600">{error}</p>}

          {drafts.length === 0 && savedConcepts.filter(c => c.status !== 'Rejected').length === 0 && !generating && (
            <p className="text-sm text-stone-400 text-center py-8">Fill in the design request and generate style suggestions for {customer.name}.</p>
          )}

          {drafts.map(d => (
            <ConceptCard key={d.tempId} concept={d}
              onApprove={() => saveConcept(d, 'Approved')}
              onReject={(reason) => saveConcept(d, 'Rejected', reason)}
              onRegenerate={() => generate(d.concept_name)}
            />
          ))}

          {savedConcepts.filter(c => c.status !== 'Rejected').map(c => (
            <ConceptCard key={c.id} concept={c} onConvert={() => convertToOrder(c)} />
          ))}
        </div>
      </div>
    </div>
  );
}