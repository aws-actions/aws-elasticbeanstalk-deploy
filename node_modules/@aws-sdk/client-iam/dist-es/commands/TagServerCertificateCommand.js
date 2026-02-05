import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { TagServerCertificate$ } from "../schemas/schemas_0";
export { $Command };
export class TagServerCertificateCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "TagServerCertificate", {})
    .n("IAMClient", "TagServerCertificateCommand")
    .sc(TagServerCertificate$)
    .build() {
}
