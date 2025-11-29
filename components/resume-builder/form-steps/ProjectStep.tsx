import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { UseFormRegister, FieldErrors, UseFieldArrayReturn } from "react-hook-form";
import { FormValues } from "../types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

// ProjectsStep Component
interface ProjectsStepProps {
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
  fields: UseFieldArrayReturn<FormValues, "projects">["fields"];
  append: UseFieldArrayReturn<FormValues, "projects">["append"];
  remove: UseFieldArrayReturn<FormValues, "projects">["remove"];
}

export const ProjectsStep: React.FC<ProjectsStepProps> = ({
    register,
    errors,
    fields,
    append,
    remove
  }) => {
    return (
      <div className="space-y-6">
        {fields.map((field, index) => (
          <Card key={field.id} className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Project {index + 1}</h3>
              <Button 
                type="button" 
                variant="destructive" 
                size="sm"
                onClick={() => remove(index)}
              >
                Remove
              </Button>
            </div>
  
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Project Name</Label>
                <Input {...register(`projects.${index}.projectName`)} />
                {errors.projects?.[index]?.projectName && 
                  <p className="text-destructive text-sm">{errors.projects[index]?.projectName?.message}</p>}
              </div>
  
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea 
                  {...register(`projects.${index}.description`)}
                  className="min-h-[100px]"
                />
                {errors.projects?.[index]?.description && 
                  <p className="text-destructive text-sm">{errors.projects[index]?.description?.message}</p>}
              </div>
  
              <div className="space-y-2">
                <Label>Project Link</Label>
                <Input {...register(`projects.${index}.link`)} />
                {errors.projects?.[index]?.link && 
                  <p className="text-destructive text-sm">{errors.projects[index]?.link?.message}</p>}
              </div>
            </div>
          </Card>
        ))}
  
        <Button
          type="button"
          variant="outline"
          onClick={() => append({ projectName: "", description: "", link: "" })}
        >
          Add Project
        </Button>
      </div>
    );
  };