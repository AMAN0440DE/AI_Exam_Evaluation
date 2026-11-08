const Group = require("../model/group");

const groupDao = {
    createGroup: async (data) => {
        const newGroup = new Group(data);
        return await newGroup.save();
    },

    updateGroup: async (data) => {
        const { groupId, name, description, thumbnail, adminEmail } = data;

        return await Group.findByIdAndUpdate(groupId, {
            name, description, thumbnail, adminEmail,
        }, { new: true });
    },

    addMembers: async (groupId, ...membersEmails) => {
        return await Group.findByIdAndUpdate(groupId, {
            $addToSet: { membersEmail: { $each: membersEmails }}
        }, { new: true });
    },

    removeMembers: async (groupId, ...membersEmails) => {
        return await Group.findByIdAndUpdate(groupId, {
            $pull: { membersEmail: { $in: membersEmails } }
        }, { new: true });
    },

    getGroupByEmail: async (email) => {
        return await Group.find({ membersEmail: email });
    },

    getGroupsPaginated: async(email, limit, skip, sortOptions = {createdAt: -1})=>{
        const[groups, totalCount] = await Promise.all([
            //find group with given email
            //sort them to preserve order across
            //pagination requests, and then perform
            //skip and limit to get the desired page
            await Group.find({membersEmail: email})
            .sort(sortOptions)
            .skip(skip)
            .limit(limit),

            //cnt the number of records present in the collection with given mail.
            Group.countDocuments({membersEmail: email})
        ]);
        return {groups, totalCount};
    },
};

module.exports = groupDao;