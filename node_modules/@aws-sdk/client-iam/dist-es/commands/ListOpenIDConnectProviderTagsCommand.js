import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { ListOpenIDConnectProviderTags$ } from "../schemas/schemas_0";
export { $Command };
export class ListOpenIDConnectProviderTagsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "ListOpenIDConnectProviderTags", {})
    .n("IAMClient", "ListOpenIDConnectProviderTagsCommand")
    .sc(ListOpenIDConnectProviderTags$)
    .build() {
}
