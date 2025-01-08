import { IsEnum, } from "class-validator";
import { MODEL } from "src/types/enum";

export class QueryModelDto {
    @IsEnum(MODEL, {
        message: 'model must be one of the following values: deepseek-v3, agemini-1.5-flash',
      })
    model: MODEL;
}