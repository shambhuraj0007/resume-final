import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import DatePickerComponent from "../components/DatePicker";

import { UseFormRegister, FieldErrors, UseFieldArrayReturn } from "react-hook-form";
import { FormValues } from "../types";

interface CertificationsStepProps {
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
  fields: UseFieldArrayReturn<FormValues, "certifications">["fields"];
  append: UseFieldArrayReturn<FormValues, "certifications">["append"];
  remove: UseFieldArrayReturn<FormValues, "certifications">["remove"];
}

export const CertificationsStep = ({
  register,
  errors,
  fields,
  append,
  remove,
}: CertificationsStepProps) => {
  return (
    <div className="space-y-6">
      {fields.map((field, index) => (
        <Card key={field.id} className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Certification {index + 1}</h3>
            {
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => remove(index)}
              >
                Remove
              </Button>
            }
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Certification Name</Label>
              <Input
                {...register(`certifications.${index}.certificationName`)}
              />
              {errors.certifications?.[index]?.certificationName && (
                <p className="text-destructive text-sm">
                  {errors.certifications[index]?.certificationName?.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Issuing Organization</Label>
              <Input
                {...register(`certifications.${index}.issuingOrganization`)}
              />
              {errors.certifications?.[index]?.issuingOrganization && (
                <p className="text-destructive text-sm">
                  {errors.certifications[index]?.issuingOrganization?.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <DatePickerComponent
                label="Issue Date"
                register={register}
                schema={`certifications.${index}.issueDate`}
              />
              {errors.certifications?.[index]?.issueDate && (
                <p className="text-destructive text-sm">
                  {errors.certifications[index]?.issueDate?.message}
                </p>
              )}
            </div>
          </div>
        </Card>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={() =>
          append({
            certificationName: "",
            issuingOrganization: "",
            issueDate: "",
          })
        }
      >
        Add Certification
      </Button>
    </div>
  );
};
