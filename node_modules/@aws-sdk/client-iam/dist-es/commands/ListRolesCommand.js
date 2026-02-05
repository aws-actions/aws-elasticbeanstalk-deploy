import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { ListRoles$ } from "../schemas/schemas_0";
export { $Command };
export class ListRolesCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "ListRoles", {})
    .n("IAMClient", "ListRolesCommand")
    .sc(ListRoles$)
    .build() {
}
