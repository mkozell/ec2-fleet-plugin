package com.amazon.jenkins.ec2fleet;

import hudson.Extension;
import hudson.model.AbstractDescribableImpl;
import hudson.model.Descriptor;

public class CreateFleet extends AbstractDescribableImpl<CreateFleet> {

    @Extension
    public static class DescriptorImpl extends Descriptor<CreateFleet> {



    }

}
