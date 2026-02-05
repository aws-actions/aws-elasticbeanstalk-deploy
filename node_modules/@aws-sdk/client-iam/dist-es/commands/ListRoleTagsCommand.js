import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { ListRoleTags$ } from "../schemas/schemas_0";
export { $Command };
export class ListRoleTagsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "ListRoleTags", {})
    .n("IAMClient", "ListRoleTagsCommand")
    .sc(ListRoleTags$)
    .build() {
}
