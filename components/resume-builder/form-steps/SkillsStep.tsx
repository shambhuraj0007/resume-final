import { Card } from "@/components/ui/card";
import { UseFormRegister, FieldErrors, UseFieldArrayReturn, UseFormWatch } from "react-hook-form";
import { FormValues } from "../types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface SkillsStepProps {
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
  fields: UseFieldArrayReturn<FormValues, "skills">["fields"];
  append: UseFieldArrayReturn<FormValues, "skills">["append"];
  remove: UseFieldArrayReturn<FormValues, "skills">["remove"];
  watch: UseFormWatch<FormValues>;
}

export const SkillsStep: React.FC<SkillsStepProps> = ({
  register,
  errors,
  fields,
  append,
  remove,
  watch,
}) => {
  return (
    <div className="space-y-6">
      {fields.map((field, index) => {
        const skillType = watch(`skills.${index}.skillType`) || field.skillType || "group";

        return (
          <Card key={field.id} className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">
                {skillType === "group" ? `Skill Category ${index + 1}` : `Skill ${index + 1}`}
              </h3>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => remove(index)}
              >
                Remove
              </Button>
            </div>

            {/* Render inputs based on skillType */}
            <div className="space-y-4">
              {skillType === "individual" ? (
                <>
                {/* Individual schema */}
                <div className="space-y-2">
                  <Label>Skill</Label>
                  <Input {...register(`skills.${index}.skill`)} placeholder="e.g. Communication, Leadership" />
                  {errors.skills?.[index]?.skill && (
                    <p className="text-destructive text-sm">
                      {errors.skills[index]?.skill?.message}
                    </p>
                  )}
                </div>
              </>
              ) : (
                <>
                {/* Group schema */}
                <div className="space-y-2">
                  <Label>Category Name</Label>
                  <Input {...register(`skills.${index}.category`)} placeholder="e.g. Web Dev" />
                  {errors.skills?.[index]?.category && (
                    <p className="text-destructive text-sm">
                      {errors.skills[index]?.category?.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Skills (comma-separated)</Label>
                  <Input
                    placeholder="e.g. HTML, CSS, JavaScript"
                    {...register(`skills.${index}.skills`)}
                  />
                  {errors.skills?.[index]?.skills && (
                    <p className="text-destructive text-sm">
                      {errors.skills[index]?.skills?.message}
                    </p>
                  )}
                </div>
              </>
              )}
            </div>
          </Card>
        );
      })}

      <div className="space-y-4 space-x-2">
        {/* Add new group or individual skill */}
        <Button
          type="button"
          variant="outline"
          onClick={() => append({ skillType: "group", category: "", skills: "" })} // Default to group
        >
          Add Skill Category
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => append({ skillType: "individual", skill: "" })} // Add individual skill
        >
          Add Individual Skill
        </Button>
      </div>
    </div>
  );
};
