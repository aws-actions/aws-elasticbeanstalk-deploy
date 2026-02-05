import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { ListPoliciesGrantingServiceAccess$ } from "../schemas/schemas_0";
export { $Command };
export class ListPoliciesGrantingServiceAccessCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "ListPoliciesGrantingServiceAccess", {})
    .n("IAMClient", "ListPoliciesGrantingServiceAccessCommand")
    .sc(ListPoliciesGrantingServiceAccess$)
    .build() {
}
