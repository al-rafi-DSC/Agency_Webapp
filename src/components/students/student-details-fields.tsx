"use client";
import { useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TextField } from "@/components/workspace/text-field";
import { SelectField } from "@/components/workspace/mutation-form";
import { PRE_ENROLLMENT_STATUS_LABELS, PROGRAM_LABELS, SPONSORSHIP_LABELS, VISA_STATUS_LABELS, type Student } from "@/types/db";

const options = (labels: Record<string, string>, empty: string) =>
  [{ value: "", label: empty }, ...Object.entries(labels).map(([value, label]) => ({ value, label }))];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <><h3 className="border-t pt-4 text-sm font-semibold sm:col-span-2">{title}</h3>{children}</>;
}

function AreaField({ name, label, value = "" }: { name: string; label: string; value?: string }) {
  const id = `field-${name}`;
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Textarea id={id} name={name} defaultValue={value} maxLength={500} rows={2} /></div>;
}

/**
 * The optional detail fields shared by "Open a student file" and the file's
 * Details tab. Rendered inside a grid with two columns. Visa outcome boxes
 * appear once a visa appointment date is entered, the sponsor boxes once
 * "Sponsor" is chosen. The action and database enforce the same rules.
 */
export function StudentDetailsFields({ student = {} }: { student?: Partial<Student> }) {
  const [visaDate, setVisaDate] = useState(student.visa_appointment_date ?? "");
  const [sponsorship, setSponsorship] = useState<string>(student.sponsorship ?? "");
  const charge = student.file_opening_charge_percent;
  return <>
    <Section title="Contact and identity">
      <TextField name="email" label="Student Gmail" value={student.email ?? ""} type="email" maxLength={320} />
      <TextField name="agency_email" label="Agency Gmail for student" value={student.agency_email ?? ""} type="email" maxLength={320} />
      <TextField name="passport_number" label="Passport / Carta d'Identità number" value={student.passport_number ?? ""} maxLength={60} />
      <TextField name="tax_code" label="Codice fiscale / tax code" value={student.tax_code ?? ""} maxLength={40} />
      <TextField name="date_of_birth" label="Date of birth" value={student.date_of_birth ?? ""} type="date" />
      <TextField name="birth_place" label="Birth place" value={student.birth_place ?? ""} maxLength={200} />
    </Section>
    <Section title="Programme and file">
      <SelectField name="program" label="Program" defaultValue={student.program ?? ""} options={options(PROGRAM_LABELS, "Not set")} />
      <TextField name="intake_session" label="Session (e.g. 2026/27)" value={student.intake_session ?? ""} maxLength={60} />
      <SelectField name="pre_enrollment_status" label="Pre-enrollment summary" defaultValue={student.pre_enrollment_status ?? ""}
        options={options(PRE_ENROLLMENT_STATUS_LABELS, "Not set")} />
      <div className="space-y-2"><Label htmlFor="field-file_opening_charge_percent">File opening charge (%)</Label>
        <Input id="field-file_opening_charge_percent" name="file_opening_charge_percent" type="number" inputMode="decimal"
          min={0} max={100} step="0.01" placeholder="e.g. 40" defaultValue={charge === null || charge === undefined ? "" : String(Number(charge))} /></div>
      <TextField name="referral" label="File referral" value={student.referral ?? ""} maxLength={200} />
    </Section>
    <Section title="Visa">
      <TextField name="visa_country" label="Country of visa application" value={student.visa_country ?? ""} maxLength={100} />
      <div className="space-y-2"><Label htmlFor="field-visa_appointment_date">Visa appointment date</Label>
        <Input id="field-visa_appointment_date" name="visa_appointment_date" type="date" value={visaDate} onChange={(e) => setVisaDate(e.target.value)} /></div>
      {visaDate ? <>
        <SelectField name="visa_file_submitted" label="Visa file submission"
          defaultValue={student.visa_file_submitted === true ? "yes" : student.visa_file_submitted === false ? "no" : ""}
          options={[{ value: "", label: "Not set" }, { value: "yes", label: "Yes" }, { value: "no", label: "No" }]} />
        <SelectField name="visa_status" label="Visa status" defaultValue={student.visa_status ?? ""} options={options(VISA_STATUS_LABELS, "Not decided yet")} />
      </> : null}
    </Section>
    <Section title="Family and address">
      <TextField name="father_name" label="Father's name" value={student.father_name ?? ""} maxLength={200} />
      <TextField name="mother_name" label="Mother's name" value={student.mother_name ?? ""} maxLength={200} />
      <AreaField name="permanent_address" label="Permanent address" value={student.permanent_address} />
      <AreaField name="present_address" label="Present address" value={student.present_address} />
    </Section>
    <Section title="Sponsorship">
      <SelectField name="sponsorship" label="Sponsorship" defaultValue={sponsorship} onValueChange={setSponsorship} options={options(SPONSORSHIP_LABELS, "Not set")} />
      {sponsorship === "sponsor" ? <>
        <div className="hidden sm:block" />
        <TextField name="sponsor_name" label="Sponsor's name" value={student.sponsor_name ?? ""} required minLength={1} maxLength={200} />
        <TextField name="sponsor_relationship" label="Relationship to student" value={student.sponsor_relationship ?? ""} required minLength={1} maxLength={200} />
      </> : null}
    </Section>
  </>;
}
