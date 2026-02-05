import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { TagRole$ } from "../schemas/schemas_0";
export { $Command };
export class TagRoleCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "TagRole", {})
    .n("IAMClient", "TagRoleCommand")
    .sc(TagRole$)
    .build() {
}
