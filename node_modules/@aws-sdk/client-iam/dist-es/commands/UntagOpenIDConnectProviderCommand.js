import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { UntagOpenIDConnectProvider$ } from "../schemas/schemas_0";
export { $Command };
export class UntagOpenIDConnectProviderCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "UntagOpenIDConnectProvider", {})
    .n("IAMClient", "UntagOpenIDConnectProviderCommand")
    .sc(UntagOpenIDConnectProvider$)
    .build() {
}
