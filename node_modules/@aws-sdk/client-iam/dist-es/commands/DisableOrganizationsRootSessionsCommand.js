import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DisableOrganizationsRootSessions$ } from "../schemas/schemas_0";
export { $Command };
export class DisableOrganizationsRootSessionsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "DisableOrganizationsRootSessions", {})
    .n("IAMClient", "DisableOrganizationsRootSessionsCommand")
    .sc(DisableOrganizationsRootSessions$)
    .build() {
}
