import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { EnableOrganizationsRootCredentialsManagement$ } from "../schemas/schemas_0";
export { $Command };
export class EnableOrganizationsRootCredentialsManagementCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "EnableOrganizationsRootCredentialsManagement", {})
    .n("IAMClient", "EnableOrganizationsRootCredentialsManagementCommand")
    .sc(EnableOrganizationsRootCredentialsManagement$)
    .build() {
}
